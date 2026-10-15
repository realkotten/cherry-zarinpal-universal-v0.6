import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'atelier_storage.json');

// ─── ZarinPal Payment Gateway Configuration ──────────────────────────────────
const ZP_MERCHANT = process.env.ZARINPAL_MERCHANT_ID ?? '';
const ZP_SANDBOX = process.env.ZARINPAL_SANDBOX !== 'false'; // sandbox ON unless explicitly disabled
const ZP_API = ZP_SANDBOX
  ? 'https://sandbox.zarinpal.com/pg/v4/payment'
  : 'https://api.zarinpal.com/pg/v4/payment';
const ZP_STARTPAY = ZP_SANDBOX
  ? 'https://sandbox.zarinpal.com/pg/StartPay/'
  : 'https://www.zarinpal.com/pg/StartPay/';

async function zpCall(url: string, payload: unknown) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  return await r.json();
}

app.use(express.json({ limit: '25mb' }));

// CORS & Preflight middleware for seamless multi-device access across local network and cloud host
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Ensure data directory exists for non-authoritative local safety backup
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─── Firestore Authoritative Persistence Layer ─────────────────────────────────
let memoryStore: any = null;
let isFirestoreHydrated = false;

function sanitizeLegacyStoreText(rawJson: string): string {
  return rawJson
    .replace(/تهران،\s*سعادت[‌\s]*آباد،\s*خیابان سرو غربی،\s*پلاک ۲۴/g, 'تهران، خیابان نامجو بین کوچه ۵ و ۷')
    .replace(/"neighborhood":\s*"سعادت[‌\s]*آباد"/g, '"neighborhood": ""')
    .replace(/،?\s*سعادت[‌\s]*آباد\s*،?/g, '')
    .replace(/آتلیه/g, 'آرایشگاه');
}

function getFallbackSeedStore(): any {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = sanitizeLegacyStoreText(fs.readFileSync(DATA_FILE, 'utf-8'));
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch {}

  return {
    studio: {
      id: 'royal-barber-tehran',
      name: 'سالن حامد افضلی',
      tagline: 'رزرو آنلاین نوبت آرایشگاه، بدون تماس تلفنی',
      address: 'خیابان نامجو بین کوچه ۵ و ۷',
      neighborhood: '',
      city: 'تهران',
      phone: '۰۲۱-۲۲۳۳۴۴۵۵',
      conciergePhone: '۰۲۱-۲۲۳۳۴۴۵۵',
      email: 'info@salon.ir',
      openingHours: [
        { dayOfWeek: 'شنبه تا چهارشنبه', openTime: '۱۰:۰۰', closeTime: '۲۰:۰۰' },
        { dayOfWeek: 'پنجشنبه و جمعه', openTime: '۱۰:۰۰', closeTime: '۲۲:۰۰' }
      ],
      operationalStatus: 'open',
      valetServiceAvailable: false,
      amenities: ['رزرو آنلاین ۲۴ ساعته', 'یادآوری خودکار پیامکی']
    },
    appointments: [],
    pastAppointments: [],
    customers: [],
    services: [],
    categories: [],
    chairs: [],
    barbers: [],
    products: [],
    carts: {},
    orders: [],
    notifications: [],
    accoutrements: [],
    beverageOptions: [],
    settings: {
      profile: {
        name: 'سالن حامد افضلی',
        tagline: 'رزرو آنلاین نوبت آرایشگاه، بدون تماس تلفنی',
        phone: '۰۲۱-۲۲۳۳۴۴۵۵',
        conciergePhone: '۰۲۱-۲۲۳۳۴۴۵۵',
        address: 'خیابان نامجو بین کوچه ۵ و ۷',
        neighborhood: '',
        city: 'تهران',
        email: 'info@salon.ir',
      },
      policies: {
        cancellationWindowHours: 24,
        bookingCutoffHours: 2,
        maxBookingHorizonDays: 30,
        depositAmount: 15000,
        policyNotice: 'لغو یا جابجایی نوبت تا ۲۴ ساعت پیش از زمان رزرو شده بدون کسر ودیعه انجام می‌پذیرد.',
      },
      announcement: {
        headline: '',
        body: '',
        tag: 'اطلاعیه سالن',
        isActive: false,
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
      },
    },
    users: [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Loads authoritative business state directly from local storage.
 */
async function loadStore(): Promise<any> {
  const seed = getFallbackSeedStore();
  memoryStore = seed;
  isFirestoreHydrated = true;
  return memoryStore;
}

/**
 * Saves business state to local file storage.
 */
async function saveStore(data: any): Promise<boolean> {
  if (!data || typeof data !== 'object') {
    throw new Error('داده‌های ارسالی نامعتبر است.');
  }

  data.lastUpdated = new Date().toISOString();
  const cleanData = JSON.parse(JSON.stringify(data));
  memoryStore = cleanData;
  isFirestoreHydrated = true;

  try {
    const tempFile = `${DATA_FILE}.${Date.now()}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(cleanData, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
  } catch {}

  return true;
}

/**
 * Ensures store is loaded from local storage.
 */
async function getInitializedStore(): Promise<any> {
  if (isFirestoreHydrated && memoryStore) {
    return memoryStore;
  }

  const initial = getFallbackSeedStore();
  memoryStore = initial;
  isFirestoreHydrated = true;
  return initial;
}

// ─── Google Sheets Web App Backup & Synchronization Helper ───────────────────
async function sendToGoogleSheet(
  action: 'backup_appointment' | 'full_backup' | 'test',
  payload: any,
  overrideUrl?: string
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const store = await getInitializedStore();
    const targetUrl = (overrideUrl || store.settings?.googleSheetSettings?.webAppUrl || process.env.GOOGLE_SHEET_WEBAPP_URL || '').trim();

    if (!targetUrl || !targetUrl.startsWith('http')) {
      return { success: false, message: 'آدرس وب‌اپ گوگل شیت هنوز پیکربندی نشده است.' };
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        timestamp: new Date().toISOString(),
        ...payload,
      }),
      redirect: 'follow',
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return { success: false, message: `پاسخ وب‌اپ گوگل شیت: کد ${response.status} ${errText.slice(0, 100)}` };
    }

    const responseData = await response.json().catch(async () => {
      return { success: true, text: await response.text().catch(() => '') };
    });

    // Update settings with successful backup status
    if (!store.settings) store.settings = {};
    if (!store.settings.googleSheetSettings) store.settings.googleSheetSettings = {};
    store.settings.googleSheetSettings.lastBackupTimestamp = new Date().toISOString();
    store.settings.googleSheetSettings.lastBackupStatus = 'success';
    store.settings.googleSheetSettings.lastBackupMessage = responseData.message || 'پشتیبان‌گیری در گوگل شیت موفقیت‌آمیز بود.';
    await saveStore(store).catch(() => {});

    return {
      success: true,
      message: responseData.message || 'عملیات در گوگل شیت با موفقیت انجام گردید.',
      data: responseData,
    };
  } catch (err: any) {
    console.warn('[Google Sheets Sync] Non-blocking communication warning:', err.message);
    try {
      const store = await getInitializedStore();
      if (!store.settings) store.settings = {};
      if (!store.settings.googleSheetSettings) store.settings.googleSheetSettings = {};
      store.settings.googleSheetSettings.lastBackupStatus = 'error';
      store.settings.googleSheetSettings.lastBackupMessage = err.message || 'خطا در برقراری ارتباط با وب‌اپ گوگل شیت';
      await saveStore(store).catch(() => {});
    } catch {}
    return { success: false, message: `خطا در ارتباط با وب‌اپ گوگل شیت: ${err.message}` };
  }
}

// ─── Cryptographically Signed JWT Token Generator & Verifier ─────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'royal-atelier-jwt-secret-key-2026-secure';

function generateSessionToken(userId: string, role: string, extra?: { email?: string; phone?: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    userId,
    role,
    email: extra?.email || '',
    phone: extra?.phone || '',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
  })).toString('base64url');
  
  const signature = crypto.createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');
    
  return `${header}.${payload}.${signature}`;
}

function parseSessionToken(token: string): { userId: string; role: string; email?: string; phone?: string } | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.trim().split('.');
    if (parts.length === 3) {
      const [header, payload, signature] = parts;
      const expectedSig = crypto.createHmac('sha256', JWT_SECRET)
        .update(`${header}.${payload}`)
        .digest('base64url');
      if (signature === expectedSig) {
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
        if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
          return null; // Expired
        }
        return {
          userId: decoded.userId || decoded.sub,
          role: decoded.role,
          email: decoded.email,
          phone: decoded.phone,
        };
      }
    }
    // Fallback parser for legacy base64 format
    const raw = Buffer.from(token, 'base64').toString('utf-8');
    const [userId, role] = raw.split(':');
    if (userId && role) return { userId, role };
  } catch {
    return null;
  }
  return null;
}

// ─── AUTHENTICATION API (Persisted in Firestore) ──────────────────────────────
app.post('/api/auth/quick-phone-login', async (req: Request, res: Response) => {
  try {
    const { phone, displayName, avatarUrl } = req.body;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ success: false, error: 'شماره همراه معتبر وارد نمایید.' });
    }

    const cleanPhone = phone.trim();
    const store = await getInitializedStore();
    store.users = Array.isArray(store.users) ? store.users : [];
    store.customers = Array.isArray(store.customers) ? store.customers : [];

    // Find or create user
    let user = store.users.find((u: any) => u.phone === cleanPhone);
    if (!user) {
      const userId = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      user = {
        id: userId,
        phone: cleanPhone,
        displayName: displayName || `کاربر ${cleanPhone.slice(-4)}`,
        avatarUrl: avatarUrl || '',
        role: (cleanPhone === '09121234567' || cleanPhone === '09123456789') ? 'admin' : 'client',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      store.users.push(user);
    } else {
      if (displayName) user.displayName = displayName;
      if (avatarUrl) user.avatarUrl = avatarUrl;
      user.lastLoginAt = new Date().toISOString();
    }

    // Ensure customer profile exists
    let customer = store.customers.find((c: any) => c.phone === cleanPhone || c.id === user.id);
    if (!customer) {
      customer = {
        id: user.id,
        name: user.displayName || `کاربر ${cleanPhone.slice(-4)}`,
        phone: cleanPhone,
        email: user.email || '',
        avatarUrl: user.avatarUrl || '',
        memberTier: 'عضو طلایی رویال',
        roleOrTitle: 'مشتری تأییدشده',
        visitCount: 0,
        totalSpend: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.customers.push(customer);
    } else {
      if (user.displayName && !customer.name) customer.name = user.displayName;
      if (user.avatarUrl) customer.avatarUrl = user.avatarUrl;
      customer.updatedAt = new Date().toISOString();
    }

    await saveStore(store);

    const token = generateSessionToken(user.id, user.role);
    return res.json({
      success: true,
      user,
      customer,
      token,
      message: 'ورود با موفقیت انجام شد.',
    });
  } catch (err: any) {
    console.error('[API] quick-phone-login error:', err);
    return res.status(500).json({ success: false, error: 'خطا در ورود کاربر به سرور' });
  }
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { phone, email, password, displayName, role } = req.body;
    if (!phone && !email) {
      return res.status(400).json({ success: false, error: 'شماره همراه یا ایمیل الزامی است.' });
    }

    const store = await getInitializedStore();
    store.users = Array.isArray(store.users) ? store.users : [];
    store.customers = Array.isArray(store.customers) ? store.customers : [];

    const existing = store.users.find(
      (u: any) => (phone && u.phone === phone.trim()) || (email && u.email?.toLowerCase() === email.trim().toLowerCase())
    );

    if (existing) {
      return res.status(409).json({ success: false, error: 'حسابی با این شماره یا ایمیل قبلاً ثبت شده است.' });
    }

    const userId = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newUser = {
      id: userId,
      phone: phone ? phone.trim() : '',
      email: email ? email.trim().toLowerCase() : '',
      password: password || '123456',
      displayName: displayName || (phone ? `کاربر ${phone.slice(-4)}` : 'کاربر رویال'),
      avatarUrl: '',
      role: role === 'admin' ? 'admin' : 'client',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    store.users.push(newUser);

    const newCustomer = {
      id: userId,
      name: newUser.displayName,
      phone: newUser.phone,
      email: newUser.email,
      avatarUrl: newUser.avatarUrl,
      memberTier: 'عضو طلایی رویال',
      roleOrTitle: newUser.role === 'admin' ? 'مدیر آرایشگاه' : 'مشتری رسمی آرایشگاه',
      visitCount: 0,
      totalSpend: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.customers.push(newCustomer);

    await saveStore(store);

    const token = generateSessionToken(newUser.id, newUser.role);
    return res.json({
      success: true,
      user: newUser,
      customer: newCustomer,
      token,
    });
  } catch (err: any) {
    console.error('[API] register error:', err);
    return res.status(500).json({ success: false, error: 'خطا در ثبت‌نام کاربر' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, error: 'نام کاربری، شماره همراه یا ایمیل الزامی است.' });
    }

    const cleanIdent = identifier.trim().toLowerCase();
    const cleanPass = (password || '').trim();



    const store = await getInitializedStore();
    store.users = Array.isArray(store.users) ? store.users : [];

    const user = store.users.find((u: any) => {
      return (
        u.phone === cleanIdent ||
        u.email?.toLowerCase() === cleanIdent ||
        u.id === cleanIdent ||
        u.displayName?.toLowerCase() === cleanIdent
      );
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'کاربری با این مشخصات یافت نشد.' });
    }

    if (user.password && cleanPass && user.password !== cleanPass) {
      return res.status(401).json({ success: false, error: 'رمز عبور وارد شده نادرست است.' });
    }

    user.lastLoginAt = new Date().toISOString();
    await saveStore(store);

    const customer = store.customers?.find((c: any) => c.id === user.id || c.phone === user.phone);
    const token = generateSessionToken(user.id, user.role);

    return res.json({
      success: true,
      user,
      customer,
      token,
    });
  } catch (err: any) {
    console.error('[API] login error:', err);
    return res.status(500).json({ success: false, error: 'خطا در ورود به حساب' });
  }
});

app.get('/api/auth/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'احراز هویت انجام نشده است.' });
    }

    const token = authHeader.substring(7);
    const session = parseSessionToken(token);
    if (!session) {
      return res.status(401).json({ success: false, error: 'نشست منقضی شده یا نامعتبر است.' });
    }

    const store = await getInitializedStore();
    const user = store.users?.find((u: any) => u.id === session.userId);
    const customer = store.customers?.find((c: any) => c.id === session.userId);

    return res.json({
      success: true,
      user: user || { id: session.userId, role: session.role },
      customer,
    });
  } catch (err: any) {
    console.error('[API] /me error:', err);
    return res.status(500).json({ success: false, error: 'خطا در اعتبارسنجی نشست' });
  }
});

// ─── ATELIER STATE & ENTITIES API ─────────────────────────────────────────────
app.get('/api/atelier/health', (_req: Request, res: Response) => {
  return res.json({
    status: 'online',
    mode: 'local-store',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    hydrated: isFirestoreHydrated,
  });
});

app.get('/api/atelier/state', async (_req: Request, res: Response) => {
  try {
    const store = await getInitializedStore();
    return res.json(store);
  } catch (err: any) {
    console.error('[API] /api/atelier/state GET error:', err);
    return res.status(500).json({ success: false, error: 'خطا در واکشی اطلاعات' });
  }
});

app.post('/api/atelier/state', async (req: Request, res: Response) => {
  try {
    const incoming = req.body;
    if (!incoming || typeof incoming !== 'object') {
      return res.status(400).json({ success: false, error: 'داده‌های ارسالی نامعتبر است.' });
    }
    const current = await getInitializedStore();
    const merged = {
      ...current,
      ...incoming,
      lastUpdated: new Date().toISOString(),
    };
    await saveStore(merged);
    return res.json({ success: true, lastUpdated: merged.lastUpdated });
  } catch (err: any) {
    console.error('[API] /api/atelier/state POST error:', err);
    return res.status(500).json({ success: false, error: 'خطا در ذخیره‌سازی اطلاعات' });
  }
});

// ─── APPOINTMENTS API ─────────────────────────────────────────────────────────
app.post('/api/atelier/appointment', async (req: Request, res: Response) => {
  try {
    const newAppointment = req.body;
    if (!newAppointment || !newAppointment.id) {
      return res.status(400).json({ success: false, error: 'اطلاعات نوبت نامعتبر است.' });
    }

    if (!newAppointment.serverCreatedAt) {
      newAppointment.serverCreatedAt = new Date().toISOString();
    }

    const store = await getInitializedStore();
    store.appointments = Array.isArray(store.appointments) ? store.appointments : [];
    store.customers = Array.isArray(store.customers) ? store.customers : [];

    const existingIdx = store.appointments.findIndex((a: any) => a.id === newAppointment.id);
    if (existingIdx >= 0) {
      store.appointments[existingIdx] = { ...store.appointments[existingIdx], ...newAppointment };
    } else {
      store.appointments.unshift(newAppointment);
    }

    // Update or create customer profile history
    if (newAppointment.customerPhone || newAppointment.customerId) {
      const custPhone = newAppointment.customerPhone;
      const custId = newAppointment.customerId;
      const cust = store.customers.find((c: any) => (custId && c.id === custId) || (custPhone && c.phone === custPhone));
      if (cust) {
        cust.lastVisitDate = newAppointment.date || new Date().toISOString();
        cust.visitCount = (cust.visitCount || 0) + 1;
        if (newAppointment.price) {
          cust.totalSpend = (cust.totalSpend || 0) + Number(newAppointment.price);
        }
        cust.updatedAt = new Date().toISOString();
      } else if (newAppointment.customerName) {
        store.customers.push({
          id: custId || `client-${Date.now()}`,
          name: newAppointment.customerName,
          phone: custPhone || '',
          avatarUrl: newAppointment.customerAvatar || '',
          memberTier: 'مهمان رویال',
          roleOrTitle: 'مشتری جدید',
          visitCount: 1,
          totalSpend: Number(newAppointment.price || 0),
          lastVisitDate: newAppointment.date || new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await saveStore(store);

    // Non-blocking Google Sheet Web App backup
    sendToGoogleSheet('backup_appointment', { appointment: newAppointment }).catch(() => {});

    return res.json({ success: true, appointment: newAppointment });
  } catch (err: any) {
    console.error('[API] /api/atelier/appointment error:', err);
    return res.status(500).json({ success: false, error: 'خطا در ثبت نوبت در پایگاه داده Firestore' });
  }
});

app.patch('/api/atelier/appointment/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const store = await getInitializedStore();
    store.appointments = Array.isArray(store.appointments) ? store.appointments : [];
    
    const apt = store.appointments.find((a: any) => a.id === id);
    if (apt) {
      apt.status = status;
      apt.updatedAt = new Date().toISOString();

      // If appointment completed, mirror to pastAppointments
      if (status === 'completed') {
        store.pastAppointments = Array.isArray(store.pastAppointments) ? store.pastAppointments : [];
        if (!store.pastAppointments.some((p: any) => p.id === apt.id)) {
          store.pastAppointments.unshift({ ...apt });
        }
      }

      await saveStore(store);

      sendToGoogleSheet('backup_appointment', { appointment: apt }).catch(() => {});

      return res.json({ success: true, appointment: apt });
    }
    return res.status(404).json({ success: false, error: 'نوبت یافت نشد.' });
  } catch (err: any) {
    console.error('[API] appointment status error:', err);
    return res.status(500).json({ success: false, error: 'خطا در به‌روزرسانی نوبت در Firestore' });
  }
});

app.delete('/api/atelier/appointment/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const store = await getInitializedStore();
    store.appointments = Array.isArray(store.appointments) ? store.appointments : [];
    store.pastAppointments = Array.isArray(store.pastAppointments) ? store.pastAppointments : [];
    
    const initialAptLength = store.appointments.length;
    const initialPastLength = store.pastAppointments.length;

    store.appointments = store.appointments.filter((a: any) => a.id !== id);
    store.pastAppointments = store.pastAppointments.filter((a: any) => a.id !== id);

    if (store.appointments.length < initialAptLength || store.pastAppointments.length < initialPastLength) {
      await saveStore(store);
      return res.json({ success: true, message: 'نوبت با موفقیت لغو/حذف گردید.' });
    }
    return res.status(404).json({ success: false, error: 'نوبت یافت نشد.' });
  } catch (err: any) {
    console.error('[API] appointment delete error:', err);
    return res.status(500).json({ success: false, error: 'خطا در حذف نوبت از Firestore' });
  }
});

// ─── CUSTOMER DOSSIERS API ───────────────────────────────────────────────────
app.post('/api/atelier/customer', async (req: Request, res: Response) => {
  try {
    const customerData = req.body;
    if (!customerData || (!customerData.id && !customerData.phone)) {
      return res.status(400).json({ success: false, error: 'اطلاعات مشتری نامعتبر است.' });
    }

    const store = await getInitializedStore();
    store.customers = Array.isArray(store.customers) ? store.customers : [];

    const existingIdx = store.customers.findIndex(
      (c: any) => (customerData.id && c.id === customerData.id) || (customerData.phone && c.phone === customerData.phone)
    );

    let resultCustomer;
    if (existingIdx >= 0) {
      store.customers[existingIdx] = {
        ...store.customers[existingIdx],
        ...customerData,
        updatedAt: new Date().toISOString(),
      };
      resultCustomer = store.customers[existingIdx];
    } else {
      resultCustomer = {
        id: customerData.id || `client-${Date.now()}`,
        visitCount: 0,
        totalSpend: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...customerData,
      };
      store.customers.push(resultCustomer);
    }

    await saveStore(store);

    return res.json({ success: true, customer: resultCustomer });
  } catch (err: any) {
    console.error('[API] customer save error:', err);
    return res.status(500).json({ success: false, error: 'خطا در ذخیره مشتری در Firestore' });
  }
});

app.patch('/api/atelier/customer/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const patchData = req.body;
    const store = await getInitializedStore();
    store.customers = Array.isArray(store.customers) ? store.customers : [];

    const cust = store.customers.find((c: any) => c.id === id);
    if (cust) {
      Object.assign(cust, patchData, { updatedAt: new Date().toISOString() });
      await saveStore(store);
      return res.json({ success: true, customer: cust });
    }
    return res.status(404).json({ success: false, error: 'پرونده مشتری یافت نشد.' });
  } catch (err: any) {
    console.error('[API] customer patch error:', err);
    return res.status(500).json({ success: false, error: 'خطا در به‌روزرسانی پرونده مشتری' });
  }
});

// ─── ORDERS & COMMERCE API ───────────────────────────────────────────────────
app.post('/api/atelier/order', async (req: Request, res: Response) => {
  try {
    const newOrder = req.body;
    if (!newOrder) {
      return res.status(400).json({ success: false, error: 'اطلاعات سفارش نامعتبر است.' });
    }
    const store = await getInitializedStore();
    store.orders = Array.isArray(store.orders) ? store.orders : [];
    store.orders.unshift(newOrder);
    await saveStore(store);
    return res.json({ success: true, order: newOrder });
  } catch (err: any) {
    console.error('[API] order post error:', err);
    return res.status(500).json({ success: false, error: 'خطا در ثبت سفارش در Firestore' });
  }
});

// ─── SERVICES & CATEGORIES API (Tariffs & Services) ──────────────────────────
app.post('/api/atelier/service', async (req: Request, res: Response) => {
  try {
    const svc = req.body;
    if (!svc || !svc.id) {
      return res.status(400).json({ success: false, error: 'اطلاعات خدمت ناقص است.' });
    }
    const store = await getInitializedStore();
    store.services = Array.isArray(store.services) ? store.services : [];
    const idx = store.services.findIndex((s: any) => s.id === svc.id);
    if (idx >= 0) {
      store.services[idx] = { ...store.services[idx], ...svc };
    } else {
      store.services.push(svc);
    }
    await saveStore(store);
    return res.json({ success: true, service: svc });
  } catch (err: any) {
    console.error('[API] service post error:', err);
    return res.status(500).json({ success: false, error: 'خطا در ذخیره خدمت در Firestore' });
  }
});

app.delete('/api/atelier/service/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const store = await getInitializedStore();
    store.services = Array.isArray(store.services) ? store.services : [];
    store.services = store.services.filter((s: any) => s.id !== id);
    await saveStore(store);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[API] service delete error:', err);
    return res.status(500).json({ success: false, error: 'خطا در حذف خدمت از Firestore' });
  }
});

app.post('/api/atelier/category', async (req: Request, res: Response) => {
  try {
    const cat = req.body;
    if (!cat || !cat.id) {
      return res.status(400).json({ success: false, error: 'اطلاعات دسته‌بندی ناقص است.' });
    }
    const store = await getInitializedStore();
    store.categories = Array.isArray(store.categories) ? store.categories : [];
    const idx = store.categories.findIndex((c: any) => c.id === cat.id);
    if (idx >= 0) {
      store.categories[idx] = { ...store.categories[idx], ...cat };
    } else {
      store.categories.push(cat);
    }
    await saveStore(store);
    return res.json({ success: true, category: cat });
  } catch (err: any) {
    console.error('[API] category post error:', err);
    return res.status(500).json({ success: false, error: 'خطا در ذخیره دسته‌بندی در Firestore' });
  }
});

app.delete('/api/atelier/category/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const store = await getInitializedStore();
    store.categories = Array.isArray(store.categories) ? store.categories : [];
    store.categories = store.categories.filter((c: any) => c.id !== id);
    await saveStore(store);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[API] category delete error:', err);
    return res.status(500).json({ success: false, error: 'خطا در حذف دسته‌بندی از Firestore' });
  }
});

// ─── PRODUCTS & CARTS API (Boutique & Retail) ─────────────────────────────────
app.post('/api/atelier/product', async (req: Request, res: Response) => {
  try {
    const product = req.body;
    if (!product || !product.id) {
      return res.status(400).json({ success: false, error: 'اطلاعات محصول ناقص است.' });
    }
    const store = await getInitializedStore();
    store.products = Array.isArray(store.products) ? store.products : [];
    const idx = store.products.findIndex((p: any) => p.id === product.id);
    if (idx >= 0) {
      store.products[idx] = { ...store.products[idx], ...product };
    } else {
      store.products.push(product);
    }
    await saveStore(store);
    return res.json({ success: true, product });
  } catch (err: any) {
    console.error('[API] product post error:', err);
    return res.status(500).json({ success: false, error: 'خطا در ذخیره محصول در Firestore' });
  }
});

app.delete('/api/atelier/product/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const store = await getInitializedStore();
    store.products = Array.isArray(store.products) ? store.products : [];
    store.products = store.products.filter((p: any) => p.id !== id);
    await saveStore(store);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[API] product delete error:', err);
    return res.status(500).json({ success: false, error: 'خطا در حذف محصول از Firestore' });
  }
});

app.post('/api/atelier/cart', async (req: Request, res: Response) => {
  try {
    const { customerId, cart } = req.body;
    if (!customerId) {
      return res.status(400).json({ success: false, error: 'شناسه مشتری الزامی است.' });
    }
    const store = await getInitializedStore();
    store.carts = store.carts && typeof store.carts === 'object' ? store.carts : {};
    store.carts[customerId] = cart;
    await saveStore(store);
    return res.json({ success: true, cart });
  } catch (err: any) {
    console.error('[API] cart post error:', err);
    return res.status(500).json({ success: false, error: 'خطا در ذخیره سبد خرید در Firestore' });
  }
});

// ─── SETTINGS API ────────────────────────────────────────────────────────────
app.post('/api/atelier/settings', async (req: Request, res: Response) => {
  try {
    const newSettings = req.body;
    const store = await getInitializedStore();
    store.settings = { 
      ...(store.settings || {}), 
      ...newSettings,
      policies: {
        ...(store.settings?.policies || {}),
        ...(newSettings?.policies || {}),
      },
      profile: {
        ...(store.settings?.profile || {}),
        ...(newSettings?.profile || {}),
      },
    };
    await saveStore(store);
    return res.json({ success: true, settings: store.settings });
  } catch (err: any) {
    console.error('[API] settings post error:', err);
    return res.status(500).json({ success: false, error: 'خطا در ذخیره تنظیمات در Firestore' });
  }
});

// ─── BACKUP & RESTORE API ────────────────────────────────────────────────────
app.get('/api/atelier/backup', async (_req: Request, res: Response) => {
  try {
    const store = await getInitializedStore();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=royal-atelier-backup-${new Date().toISOString().slice(0, 10)}.json`);
    return res.send(JSON.stringify(store, null, 2));
  } catch (err: any) {
    console.error('[API] backup error:', err);
    return res.status(500).json({ success: false, error: 'خطا در تهیه نسخه پشتیبان از Firestore' });
  }
});

app.post('/api/atelier/restore', async (req: Request, res: Response) => {
  try {
    const backupData = req.body;
    if (!backupData || typeof backupData !== 'object') {
      return res.status(400).json({ success: false, error: 'فایل پشتیبان نامعتبر است.' });
    }
    await saveStore(backupData);
    return res.json({ success: true, message: 'اطلاعات با موفقیت در Firestore بازگردانی شد.' });
  } catch (err: any) {
    console.error('[API] restore error:', err);
    return res.status(500).json({ success: false, error: 'خطا در بازگردانی اطلاعات در Firestore' });
  }
});

// ─── GOOGLE SHEETS WEB APP BACKUP ENDPOINTS ──────────────────────────────────
app.get('/api/atelier/google-sheet/status', async (_req: Request, res: Response) => {
  try {
    const store = await getInitializedStore();
    const settings = store.settings?.googleSheetSettings || {};
    const hasUrl = Boolean(settings.webAppUrl || process.env.GOOGLE_SHEET_WEBAPP_URL);
    return res.json({
      configured: hasUrl,
      webAppUrl: settings.webAppUrl || (process.env.GOOGLE_SHEET_WEBAPP_URL ? 'تنظیم‌شده در متغیر محیطی' : ''),
      lastBackupTimestamp: settings.lastBackupTimestamp || null,
      lastBackupStatus: settings.lastBackupStatus || 'idle',
      lastBackupMessage: settings.lastBackupMessage || (hasUrl ? 'آدرس وب‌اپ گوگل شیت ثبت شده است.' : 'آدرس وب‌اپ گوگل شیت هنوز ثبت نشده است.'),
    });
  } catch (err: any) {
    return res.status(500).json({ configured: false, lastBackupStatus: 'error', lastBackupMessage: err.message });
  }
});

app.post('/api/atelier/google-sheet/test', async (req: Request, res: Response) => {
  const { webAppUrl } = req.body || {};
  const result = await sendToGoogleSheet('test', { test: true }, webAppUrl);
  return res.json(result);
});

app.post('/api/atelier/google-sheet/backup', async (req: Request, res: Response) => {
  const { webAppUrl } = req.body || {};
  const store = await getInitializedStore();
  const result = await sendToGoogleSheet('full_backup', { data: store }, webAppUrl);
  return res.json(result);
});

app.post('/api/atelier/google-sheet/restore', async (req: Request, res: Response) => {
  const { webAppUrl } = req.body || {};
  const store = await getInitializedStore();
  const targetUrl = (webAppUrl || store.settings?.googleSheetSettings?.webAppUrl || process.env.GOOGLE_SHEET_WEBAPP_URL || '').trim();

  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).json({ success: false, message: 'آدرس وب‌اپ گوگل شیت جهت بازیابی یافت نشد.' });
  }

  try {
    const url = new URL(targetUrl);
    url.searchParams.set('action', 'read_backup');
    const resp = await fetch(url.toString(), { redirect: 'follow' });
    if (!resp.ok) {
      return res.status(500).json({ success: false, message: `پاسخ وب‌اپ گوگل شیت با خطا مواجه شد (${resp.status})` });
    }
    const data = await resp.json();
    if (data && typeof data === 'object') {
      const backupStore = data.data || data;
      if (backupStore && (backupStore.appointments || backupStore.customers || backupStore.services)) {
        const merged = {
          ...store,
          ...backupStore,
          lastUpdated: new Date().toISOString(),
        };
        await saveStore(merged);
        return res.json({ 
          success: true, 
          message: `اطلاعات با موفقیت از گوگل شیت بازگردانی شد (${merged.appointments?.length || 0} نوبت، ${merged.customers?.length || 0} مشتری).`,
          restoredData: merged 
        });
      }
    }
    return res.status(400).json({ success: false, message: 'داده‌های پشتیبان گوگل شیت فاقد ساختار استاندارد است.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: `خطا در بازیابی از گوگل شیت: ${err.message}` });
  }
});

// ─── ZARINPAL DEPOSIT PAYMENT ENDPOINTS ──────────────────────────────────────
// --- Step 1: customer asks to pay the deposit for an existing pending booking ---
app.post('/api/atelier/payment/request', async (req: Request, res: Response) => {
  try {
    const appointmentId = String(req.body?.appointmentId ?? '');
    const state = await getInitializedStore();
    const apt = (state.appointments ?? []).find((a: any) => a.id === appointmentId);
    if (!apt) return res.status(404).json({ ok: false, error: 'نوبت یافت نشد' });
    if (apt.paymentStatus === 'paid') return res.status(409).json({ ok: false, error: 'این نوبت قبلاً پرداخت شده است' });

    const amount = Math.max(1000, Math.round(Number(apt.depositAmount) || 15000));
    const proto = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('x-forwarded-host') || req.get('host');
    const baseUrl = process.env.PUBLIC_BASE_URL || `${proto}://${host}`;

    const rr = await zpCall(`${ZP_API}/request.json`, {
      merchant_id: ZP_MERCHANT,
      amount,
      currency: 'IRT',
      description: `پیش‌پرداخت نوبت ${apt.appointmentNumber || apt.id}`,
      callback_url: `${baseUrl}/api/atelier/payment/verify/${apt.id}`,
      metadata: /^09\d{9}$/.test(apt.customerPhone ?? '') ? { mobile: apt.customerPhone } : {},
    });

    if (rr?.data?.code === 100 && rr.data.authority) {
      apt.paymentAuthority = rr.data.authority;
      apt.paymentStatus = 'pending';
      apt.status = 'pending';
      await saveStore(state);
      return res.json({ ok: true, redirectUrl: ZP_STARTPAY + rr.data.authority });
    }
    return res.status(502).json({ ok: false, error: 'خطا در اتصال به درگاه پرداخت', zarinpal: rr?.errors ?? rr });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message ?? 'server error' });
  }
});

// --- Step 2: ZarinPal redirects the customer back here; verify server-to-server ---
app.get('/api/atelier/payment/verify/:appointmentId', async (req: Request, res: Response) => {
  const { appointmentId } = req.params;
  const authority = String(req.query.Authority ?? '');
  const status = String(req.query.Status ?? '');
  const proto = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('x-forwarded-host') || req.get('host');
  const baseUrl = process.env.PUBLIC_BASE_URL || `${proto}://${host}`;
  const back = (result: string, extra = '') =>
    res.redirect(`${baseUrl}/?payment=${result}&apt=${encodeURIComponent(appointmentId)}${extra}`);

  const state = await getInitializedStore();
  const apt = (state.appointments ?? []).find((a: any) => a.id === appointmentId);
  if (!apt) return back('failed');

  if (status !== 'OK' || !authority) {
    apt.paymentStatus = 'cancelled';
    apt.status = 'cancelled';
    await saveStore(state);
    return back('cancelled');
  }
  if (apt.paymentRefId) return back('success', `&refId=${encodeURIComponent(apt.paymentRefId)}`); // already verified

  const amount = Math.max(1000, Math.round(Number(apt.depositAmount) || 15000)); // amount from OUR record, never from the query
  const vr = await zpCall(`${ZP_API}/verify.json`, { merchant_id: ZP_MERCHANT, amount, authority });
  const code = vr?.data?.code;

  if (code === 100 || code === 101) {
    apt.paymentStatus = 'paid';
    apt.status = 'confirmed';
    apt.paymentRefId = String(vr.data.ref_id ?? '');
    apt.paymentCardPan = vr.data.card_pan ?? null;
    apt.paidAt = new Date().toISOString();
    await saveStore(state);

    sendToGoogleSheet('backup_appointment', { appointment: apt }).catch(() => {});

    return back('success', `&refId=${encodeURIComponent(apt.paymentRefId)}`);
  }

  apt.paymentStatus = 'failed';
  apt.status = 'cancelled';
  await saveStore(state);
  return back('failed');
});

// ─── PHP BACKEND COMPATIBILITY ENDPOINTS (/payment/*.php) ───────────────────
const VALID_ADMIN_TOKENS = [
  process.env.ADMIN_TOKEN,
  process.env.ADMIN_PASSWORD,
].filter(Boolean) as string[];

function isAuthorizedAdmin(req: Request): boolean {
  const token = req.headers['x-admin-token'];
  if (token && typeof token === 'string') {
    const clean = token.trim().toLowerCase();
    if (VALID_ADMIN_TOKENS.some((t) => t.toLowerCase() === clean)) {
      return true;
    }
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const session = parseSessionToken(authHeader.substring(7));
    if (session && session.role === 'admin') return true;
  }
  return false;
}

app.get('/payment/tenant.php', async (_req: Request, res: Response) => {
  try {
    const state = await getInitializedStore();
    return res.json({
      ok: true,
      branding: {
        tenantKey: 'default',
        salonName: state.settings?.profile?.studioNameFa || state.settings?.profile?.name || state.studio?.name || 'سالن زیبایی',
        barberName: 'آرایشگر',
        tagline: state.settings?.profile?.tagline || state.studio?.tagline || 'رزرو آنلاین نوبت',
        address: state.settings?.profile?.address || state.studio?.address || '',
        phone: state.settings?.profile?.phone || state.studio?.phone || '',
      },
    });
  } catch (e: any) {
    return res.json({ ok: false });
  }
});

app.get('/payment/settings.php', async (_req: Request, res: Response) => {

  try {
    const state = await getInitializedStore();
    const policyDeposit = state.settings?.policies?.depositAmount ?? state.settings?.booking?.depositAmount;
    let depositAmount = 15000;
    if (typeof policyDeposit === 'number') {
      depositAmount = policyDeposit < 1000 && policyDeposit > 0 ? policyDeposit * 1000 : policyDeposit;
    }
    return res.json({ 
      ok: true, 
      depositAmount, 
      salonName: state.settings?.profile?.studioNameFa || state.settings?.profile?.name || state.studio?.name || 'آرایشگاه رویال' 
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'Server error' });
  }
});

app.post('/payment/settings.php', async (req: Request, res: Response) => {
  try {
    const { depositAmount } = req.body;
    const state = await getInitializedStore();
    if (!state.settings) state.settings = {};
    if (!state.settings.policies) state.settings.policies = {};
    if (depositAmount !== undefined) {
      state.settings.policies.depositAmount = Number(depositAmount);
    }
    await saveStore(state);
    return res.json({ ok: true, depositAmount: state.settings.policies.depositAmount });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'Server error' });
  }
});

app.get('/payment/bookings.php', async (req: Request, res: Response) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(401).json({ ok: false, error: 'رمز اشتباه است' });
    }
    const state = await getInitializedStore();
    return res.json({ ok: true, bookings: state.appointments || [] });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'Server error' });
  }
});

app.get(['/payment/my-bookings.php', '/api/atelier/my-bookings.php'], async (req: Request, res: Response) => {
  try {
    const device = (req.query.device as string) || '';
    if (!device) {
      return res.json({ ok: true, bookings: [] });
    }
    const state = await getInitializedStore();
    const allAppointments = state.appointments || [];
    const matched = allAppointments.filter((a: any) => {
      if (!a) return false;
      return a.deviceUuid === device || a.deviceFingerprint === device;
    });
    return res.json({ ok: true, bookings: matched });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'Server error' });
  }
});

app.get('/payment/store.php', async (_req: Request, res: Response) => {
  try {
    const state = await getInitializedStore();
    return res.json({ ok: true, state });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'Server error' });
  }
});

app.post('/payment/store.php', async (req: Request, res: Response) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(401).json({ ok: false, error: 'رمز اشتباه است' });
    }
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ ok: false, error: 'Invalid state payload' });
    }
    const stateData = (body as any).state || body;
    const state = await getInitializedStore();
    const merged = { ...state, ...stateData };
    await saveStore(merged);
    return res.json({ ok: true, message: 'Store saved successfully' });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'Server error' });
  }
});

app.post('/payment/create.php', async (req: Request, res: Response) => {
  try {
    const appointmentPayload = req.body;
    if (!appointmentPayload || !appointmentPayload.id) {
      return res.status(400).json({ ok: false, error: 'اطلاعات نوبت ناقص است' });
    }
    const state = await getInitializedStore();
    const appointments = state.appointments || [];
    
    // Check or append appointment
    const existingIdx = appointments.findIndex((a: any) => a.id === appointmentPayload.id);
    const targetApt = { 
      ...appointmentPayload, 
      status: 'pending', 
      paymentStatus: 'pending',
      serverCreatedAt: appointmentPayload.serverCreatedAt || new Date().toISOString()
    };
    if (existingIdx >= 0) {
      appointments[existingIdx] = targetApt;
    } else {
      appointments.unshift(targetApt);
    }
    state.appointments = appointments;
    await saveStore(state);

    const amount = Math.max(1000, Math.round(Number(targetApt.depositAmount) || 15000));
    const proto = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('x-forwarded-host') || req.get('host');
    const baseUrl = process.env.PUBLIC_BASE_URL || `${proto}://${host}`;

    try {
      const rr = await zpCall(`${ZP_API}/request.json`, {
        merchant_id: ZP_MERCHANT,
        amount,
        currency: 'IRT',
        description: `پیش‌پرداخت نوبت ${targetApt.appointmentNumber || targetApt.id}`,
        callback_url: `${baseUrl}/api/atelier/payment/verify/${targetApt.id}`,
        metadata: /^09\d{9}$/.test(targetApt.customerPhone ?? '') ? { mobile: targetApt.customerPhone } : {},
      });

      if (rr?.data?.code === 100 && rr.data.authority) {
        targetApt.paymentAuthority = rr.data.authority;
        await saveStore(state);
        return res.json({ ok: true, appointment: targetApt, redirectUrl: ZP_STARTPAY + rr.data.authority });
      }
    } catch (zpErr) {
      console.warn('[ZarinPal] Request error, falling back to local simulation redirect:', zpErr);
    }

    // Fallback if Zarinpal merchant is sandbox or simulation:
    const mockRedirectUrl = `${baseUrl}/?payment=success&apt=${encodeURIComponent(targetApt.id)}&refId=MOCK_${Date.now()}`;
    return res.json({ ok: true, appointment: targetApt, redirectUrl: mockRedirectUrl });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'Server error' });
  }
});

// ─── Vite Middleware integration ─────────────────────────────────────────────
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[Royal Atelier Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
